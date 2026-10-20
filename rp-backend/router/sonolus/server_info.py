from router.sonolus.index import sonolus

from sonolus_models import (
    SonolusServerInfo,
    SonolusConfiguration,
    ServerInfoAuthenticationButton,
    ServerInfoItemButton,
    ServerInfoConfigurationButton,
)

from const.env import (
    SERVICE_NAME
)



@sonolus.server.server_info(SonolusServerInfo)
async def get_server_info(ctx):
    response = SonolusServerInfo(
        
        title = SERVICE_NAME,
        
        description = "RhythmPrismへようこそ！\n当サービスは現在プレリリース中です。\n不具合等は報告をお願いします。",
        
        buttons = [
            ServerInfoAuthenticationButton(type='authentication'),
            #ServerInfoItemButton(type='post'),
            ServerInfoItemButton(type='level'),
            ServerInfoItemButton(type='skin'),
            ServerInfoItemButton(type='background'),
            ServerInfoItemButton(type='effect'),
            ServerInfoItemButton(type='particle'),
            ServerInfoItemButton(type='engine'),
            ServerInfoItemButton(type='user'),
            ServerInfoConfigurationButton(type='configuration')
        ],
        
        configuration = SonolusConfiguration(
            options = []
        ),
        
        banner = None
        
    )
    
    return response