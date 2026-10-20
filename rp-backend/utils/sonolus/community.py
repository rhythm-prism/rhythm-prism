from sonolus_models import (
    ServerItemCommunityComment
)
from db.models import (
    CommunityComment as CommunityCommentDB
)



def to_community_comment(comment: CommunityCommentDB) -> ServerItemCommunityComment:
    
    name = comment.id
    
    author = comment.author + "#" + str(comment.author_user.sonolus_handle)
    
    time = comment.created_at * 1000
    
    content = comment.content
    
    response = ServerItemCommunityComment(
        name = name,
        author = author,
        time = time,
        content = content,
        actions = []
    )
    
    return response