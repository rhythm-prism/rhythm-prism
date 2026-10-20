/**
 * usctoolを使って、sus、uscファイル等を、USCへと変換する関数を提供するモジュール。
 */

import { anyToUSC } from "usctool"
import { uscToLevelData } from "./usc2levedata.js"

export function convert(buffer: Uint8Array) {
    const { format, usc } = anyToUSC(buffer)
    const leveldata = uscToLevelData(usc)
    return {
        format,
        leveldata,
    }
}