import io
import os
import cv2
import json
import gzip
import httpx
import ffmpeg
import numpy as np
from fastapi import HTTPException, status
from PIL import Image, ImageFile, ImageOps, ImageChops

from const.env import (
    LEVEL_CONVERTER_URL
)
from const.user import UserIconDimensions



class AssetsBase:
    def __init__(self):
        pass
    
    def _load(self, base_path, file_name) -> ImageFile.ImageFile:
        path = os.path.join(base_path, file_name)
        img = Image.open(path)
        if img is None:
            raise FileNotFoundError()
        return img

class RPrismBgAssets(AssetsBase):
    def __init__(self, base_path):
        super().__init__()
        self.base =         self._load(base_path, "base.png")
        self.center_cover = self._load(base_path, "center_cover.png")
        self.center_mask =  self._load(base_path, "center_mask.png")
        self.side_cover =   self._load(base_path, "side_cover.png")
        self.side_mask =    self._load(base_path, "side_mask.png")

RPRISM_ASSETS_DIR = "./assets/original"
RPRISM_ASSETS = RPrismBgAssets(RPRISM_ASSETS_DIR)

def prepare_jacket(jacket: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(jacket))
    
    # アスペクト比を保ったまま、長い方の辺を500pxにする
    img.thumbnail(
        size=(500, 500),
        resample=Image.Resampling.LANCZOS
    )
    
    # 500px × 500pxの黒でパディングする
    img = ImageOps.pad(
        image=img, 
        size=(500, 500),
        method=Image.Resampling.LANCZOS,
        color=(0, 0, 0)
    )
    
    # RGB
    img = img.convert("RGB")
    
    return img

def _crop(img: Image.Image, x, y, w, h) -> Image.Image:
    return img.crop((x, y, x+w, y+h))

def _gen_orig_background(jacket: Image.Image) -> Image.Image:
    # ジャケットのリサイズ、切り出し
    jacket = jacket.copy().resize((510, 510))
    jacket_l = _crop(jacket.copy(), 50, 120, 188, 125)
    jacket_r = _crop(jacket.copy(), 300, 220, 188, 125)
    
    # 元のオブジェクトを書き換えないようにコピー
    base = RPRISM_ASSETS.base.copy()
    center_c = RPRISM_ASSETS.center_cover.copy()
    center_m = RPRISM_ASSETS.center_mask.copy()
    side_c = RPRISM_ASSETS.side_cover.copy()
    side_m = RPRISM_ASSETS.side_mask.copy()
    
    # カバーの透明度を調整
    center_c.putalpha(center_c.getchannel("A").point(lambda x: int(x * 0.4)))
    side_c.putalpha(side_c.getchannel("A").point(lambda x: int(x * 0.4)))
    
    # 透明なImageの上にジャケットを貼り付ける
    center_jacket_layer = Image.new("RGBA", center_m.size, (0, 0, 0, 0))
    center_jacket_layer.paste(jacket, (769, 225))
    center_jacket_layer.paste(ImageOps.flip(jacket), (770, 929))
    
    side_jacket_layer = Image.new("RGBA", side_m.size, (0, 0, 0, 0))
    side_jacket_layer.paste(jacket_l, (514, 257))
    side_jacket_layer.paste(jacket_r, (1346, 513))
    side_jacket_layer.paste(ImageOps.flip(jacket_r), (1346, 747))

    # 下にあるものからペーストしていく
    base.paste(center_jacket_layer, center_m)
    base.paste(side_jacket_layer, side_m)
    base.paste(center_c, center_c)
    base.paste(side_c, side_c)
    
    jacket.close()
    jacket_l.close()
    jacket_r.close()
    center_jacket_layer.close()
    side_jacket_layer.close()
    center_c.close()
    center_m.close()
    side_c.close()
    side_m.close()
    
    return base


def convert_jacket(jacket_data: bytes) -> tuple[io.BytesIO, io.BytesIO]:
    """
    イメージ（ジャケット）を変換する。
    戻り値 : (変換後ジャケット, 背景)
    """
    
    # ジャケットを変換
    jacket = prepare_jacket(jacket_data)
    
    # 背景を作成
    bg = _gen_orig_background(jacket)
    
    jacket_buffer = io.BytesIO()
    bg_buffer = io.BytesIO()
    
    jacket.save(jacket_buffer, format="PNG", optimize=True)
    bg.save(bg_buffer, format="PNG", optimize=True)
    
    jacket.close()
    bg.close()
    
    jacket_buffer.seek(0)
    bg_buffer.seek(0)
    
    return jacket_buffer, bg_buffer


def convert_bgm(bgm_data: bytes, start_time: float = 15.0, preview_seconds: float = 15.0) -> tuple[io.BytesIO, io.BytesIO]:
    """
    音源を変換する。
    戻り値 : (変換後bgm, プレビュー)
    """
    
    # プレビュー音源を作成
    process = (
        ffmpeg
        .input('pipe:')
        .output(
            'pipe:',
            ss=start_time,
            t=preview_seconds,
            ac=1,
            af=f"loudnorm,volume=4.0,afade=t=in:st={start_time:.3f}:d=0.5,afade=t=out:st={start_time+preview_seconds-2:.3f}:d=2",
            map_metadata=-1,
            vn=None,
            format='mp3',
            audio_bitrate='128k'
        )
        .run_async(pipe_stdin=True, pipe_stdout=True, pipe_stderr=True)
    )
    preview, _ = process.communicate(input=bgm_data)
    
    # プレイ用音源に変換
    process = (
        ffmpeg
        .input('pipe:')
        .output(
            'pipe:',
            #af="loudnorm,volume=4.0",
            map_metadata=-1,
            vn=None,
            format='mp3',
            audio_bitrate='192k'
        )
        .run_async(pipe_stdin=True, pipe_stdout=True, pipe_stderr=True)
    )
    bgm, _ = process.communicate(input=bgm_data)
    
    return io.BytesIO(bgm), io.BytesIO(preview)


async def convert_chart(chart_data: bytes) -> tuple[str, io.BytesIO]:
    """
    譜面を変換する。
    戻り値 : (譜面形式, 変換&圧縮した譜面データ(LevelData))
    """
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            LEVEL_CONVERTER_URL + "/convert",
            content = chart_data
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Chart conversion failed")
    
    response_json = response.json()
    chart_format = response_json["chartformat"]
    leveldata_buffer = io.BytesIO(gzip.compress(json.dumps(response_json["leveldata"]).encode("utf-8")))
    
    leveldata_buffer.seek(0)

    return chart_format, leveldata_buffer


def convert_icon(icon_data: bytes) -> bytes:
    array = np.frombuffer(icon_data, dtype=np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_COLOR)
    
    h, w = img.shape[:2]
    
    min_side = min(h, w)
    x = (w - min_side) // 2
    y = (h - min_side) // 2
    cropped_icon = img[y:y+min_side, x:x+min_side]
    
    resized_icon = cv2.resize(
        cropped_icon,
        (UserIconDimensions.WIDTH.value, UserIconDimensions.HEIGHT.value),
        interpolation = cv2.INTER_AREA
    )
    
    _, converted = cv2.imencode(".jpg", resized_icon)
    return converted.tobytes()


def prepare_banner(banner: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(banner))

    # アスペクト比を保ったまま、1280x720(16:9)に収まるようにリサイズ
    img.thumbnail(
        size=(1280, 720),
        resample=Image.Resampling.LANCZOS
    )

    # 1280px × 720pxの黒でパディングする
    img = ImageOps.pad(
        image=img,
        size=(1280, 720),
        method=Image.Resampling.LANCZOS,
        color=(0, 0, 0)
    )

    # RGB
    img = img.convert("RGB")

    return img