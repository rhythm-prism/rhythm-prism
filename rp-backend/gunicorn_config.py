worker_class = "uvicorn.workers.UvicornWorker"
bind = '0.0.0.0:5001'
workers = 5

def on_starting(server):
    import asyncio
    from assets.sonolus_item_resource import setup_item_resource
    
    

    asyncio.run(setup_item_resource())