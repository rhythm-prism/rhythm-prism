# DBの扱い例
# sqlalchemyの使い方: https://qiita.com/Bashi50/items/7f2214550e80b87fb922

from sqlalchemy.orm import Session
from session import create_session
from models import User
from typing import Optional
import datetime
import numpy as np

from fastapi import FastAPI, Depends
import uvicorn




app = FastAPI()


@app.get("/user/{user_id}")
def get_user_from_id(
    user_id: int,   # urlの{user_id}の部分の値を取得します
    session: Session = Depends(create_session)  # これを書くことで、リクエスト時にセッションを作成します
):
    # ユーザーIDからユーザーデータを取得する
    user: Optional[User]    # エディタ上で候補を出すために型を定義します
    user = session.get(User, user_id)   # この書き方は主キーのみ使用できます
    
    # session.close()は自動で行われるのでする必要はありません
    
    return user.name  # これでユーザー名が取得できます


@app.get("/search_user")
def get_user_from_keyword(
    keyword: str,     # クエリパラメータの値を取得します(?keyword=...)
    session: Session = Depends(create_session)
):
    # キーワードを名前に含むユーザーを全て探す(Like句)
    # 前方一致はstartwith()、後方一致はendwith()が使えます。
    # .all()はリストを返し、.first()は最初に一致したものをUserインスタンスで返します。
    user: list[User] = session.query(User)\
                              .filter(User.name.contains(keyword))\
                              .all()
                              
    # 完全一致
    user: User = session.query(User)\
                        .filter(User.name == keyword)\
                        .first()
                              
    # 複数条件
    # この場合は、キーワード=ユーザー名かつ、警告回数が0回の人を抽出できます。
    user: list[User] = session.query(User)\
                              .filter(User.name == keyword, User.warning_count == 0)\
                              .all()
                              
    # 並べ替える
    # 取得したユーザーを警告回数順に並べ替えてみます
    # この場合は、desc(降順)なので警告回数が多い順に並べ替えます
    user: list[User] = session.query(User)\
                              .filter(User.name.contains(keyword))\
                              .order_by(User.warning_count.desc())\
                              .all()
                              
    # 読み込み数、オフセットを指定する。これは負荷軽減に必須です
    # 今回の場合は、キーワードが名前に含まれている人のレコードを警告回数が多い順に並び替え、そこから21件目～40件目を取得します。
    user: list[User] = session.query(User)\
                              .filter(User.name.contains(keyword))\
                              .order_by(User.warning_count.desc())\
                              .offset(20)\
                              .limit(20)\
                              .all()
    
    text = ""
    for u in user:
        text += f"{u.name} "
        
    return text


# ユーザー追加
@app.get("/add_user")
def add_user(
    user_name: str,
    session: Session = Depends(create_session)
):
    # ユーザーIDを計算
    user_id = np.base_repr(int(datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).timestamp() * 1000), 36)
    
    # ユーザーを作成
    user = User(
        id = user_id,
        name = user_name
    )
    
    # userテーブルに追加
    session.add(user)
    
    # DBに反映させます
    session.commit()
    

# ユーザー情報編集
@app.get("/edit_user")
def add_user(
    user_id: str,
    user_name: str,
    session: Session = Depends(create_session)
):
    # ユーザーIDからユーザーを検索
    user: User = session.get(User, user_id)
    
    # 編集
    user.name = user_name
    
    # DBに反映させます
    session.commit()
    
    return ""
    
    
# ユーザー削除
@app.get("/delete_user")
def delete_user(
    user_id: str,
    session: Session = Depends(create_session)
):
    # ユーザーIDからユーザーを検索
    user: User = session.get(User, user_id)
    
    # 削除
    session.delete(user)
    
    # DBに反映させます
    session.commit()
    
    # query()から削除する場合
    # user: User = session.query(User)\
    #                     .filter(User.id == user_id)\
    #                     .first()
    #
    # session.dalete(user)
    #
    # session.commit()
    
    return ""


if __name__ == "__main__":
    uvicorn.run("example:app", port=5000, reload=True, host="0.0.0.0")