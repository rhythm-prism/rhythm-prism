import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { promisify } from 'util'
import { gunzip } from 'zlib'
import { susToUSC, uscToLevelData as externalUscToLevelData, type USC } from '@next-sekai/sonolus-next-sekai-engine'
import type { LevelData } from '@sonolus/core'
import { uscToLevelData as localUscToLevelData } from './usc/index.js'



const MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024 // 10 MiB

const gunzipAsync = promisify(gunzip)

const app = new Hono()

app.get('/', (c) => {
  return c.text('ok')
})

app.post('/convert', async (c) => {
    const chartBuffer = await c.req.arrayBuffer()

    let chartFormat: string
    let leveldata: LevelData

    try {
        const decompressedBuffer = await gunzipAsync(chartBuffer, {maxOutputLength: MAX_DECOMPRESSED_SIZE})
        leveldata = JSON.parse(Buffer.from(decompressedBuffer).toString('utf-8'))
        chartFormat = 'leveldata'

    } catch (e) {
        const chartText = Buffer.from(chartBuffer).toString('utf-8')
        let usc: USC

        try {
            usc = JSON.parse(chartText).usc
            leveldata = localUscToLevelData(usc as Parameters<typeof localUscToLevelData>[0])
            chartFormat = 'usc'

        } catch (e) {
            try {
                usc = susToUSC(chartText)
                leveldata = externalUscToLevelData(usc)
                chartFormat = 'sus'

            } catch (e) {
                return c.json({error: String(e)}, 500)
            }
        }
    }

    return c.json({'chartformat': chartFormat, 'leveldata': leveldata})
})

serve({
  fetch: app.fetch,
  port: 5003
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})