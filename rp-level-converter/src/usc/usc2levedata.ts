/**
 * usctoolを使ってUSCに変換されたデータをNextSekaiのLevelDataに変換するモジュール。
 * This module converts data converted to USC using usctool into NextSekai's LevelData.
 */

import type { USC, USCDamageNote, USCGuideNote, USCSlideNote, USCSingleNote, USCTimeScaleChange } from "usctool"
import {
    EngineArchetypeDataName,
    EngineArchetypeName,
    type LevelData,
    type LevelDataEntity,
    type LevelDataEntityData,
} from "./type.js"

type USCSlideConnection = USCSlideNote["connections"][number]
type USCSlideAttachConnectionWithPosition = Extract<USCSlideConnection, { type: "attach" }> & {
    lane?: number
    size?: number
}
type USCSlideEase = "linear" | "in" | "out" | "inout"
type USCTimeScaleGroupChange = USCTimeScaleChange["changes"][number]
type SlideLike = {
    critical: boolean
    connections: USCSlideConnection[]
    guideColor?: USCGuideNote["color"]
    guideFade?: USCGuideNote["fade"]
}
type SimLineCandidate = {
    lane: number
    entity: LevelDataEntity
}
type SlideAttach = {
    connection: USCSlideConnection
    entity: LevelDataEntity
}
type SlideSegment = {
    head: LevelDataEntity
    tail: LevelDataEntity
    headConnection: USCSlideConnection
    tailConnection: USCSlideConnection
    headBeat: number
    tailBeat: number
    attaches: SlideAttach[]
}

export function uscToLevelData(usc: USC, offset: number = 0): LevelData {
    let id = 0
    const getName = () => (id++).toString(16)
    const getEntityName = (entity: LevelDataEntity) => (entity.name ??= getName())

    const entities: LevelDataEntity[] = [
        {
            archetype: "Initialization",
            data: [valueData("initialLife", 1000)],
        },
    ]

    const timeScaleGroups: LevelDataEntity[] = []
    const timeScaleChangesByGroup: USCTimeScaleGroupChange[][] = []
    const allowSimLines = new Map<number, SimLineCandidate[]>()

    const ensureTimeScaleGroup = (index: number) => {
        for (let i = timeScaleGroups.length; i <= index; i++) {
            const entity: LevelDataEntity = {
                archetype: "#TIMESCALE_GROUP",
                data: [refData("editorName", i === 0 ? "デフォルト" : `#${i}`)],
            }

            timeScaleGroups.push(entity)
        }

        return timeScaleGroups[index]
    }

    const timeScaleGroupRef = (index: number) => getEntityName(ensureTimeScaleGroup(index))

    prepareTimeScaleGroups(usc, ensureTimeScaleGroup, timeScaleChangesByGroup)
    ensureTimeScaleGroup(1)

    for (const object of usc.objects) {
        switch (object.type) {
            case "bpm":
                entities.push(createBpmChangeEntity(object.beat, object.bpm))
                break

            case "timeScaleGroup":
                break

            default:
                break
        }
    }

    entities.push(...timeScaleGroups)

    appendTimeScaleChanges({
        entities,
        timeScaleGroups,
        timeScaleChangesByGroup,
        getEntityName,
    })

    for (const object of usc.objects) {
        switch (object.type) {
            case "bpm":
            case "timeScaleGroup":
                break

            case "single": {
                const entity = createSingleNoteEntity(object, timeScaleGroupRef(object.timeScaleGroup))
                addSimLineCandidate(allowSimLines, object.beat, object.lane, entity)
                entities.push(entity)
                break
            }

            case "slide":
                convertSlideNote(object, {
                    entities,
                    allowSimLines,
                    getEntityName,
                    timeScaleGroupRef,
                })
                break

            case "guide": {
                const guideSlide = createGuideSlide(object)
                if (guideSlide) {
                    convertSlideNote(
                        guideSlide,
                        {
                            entities,
                            allowSimLines,
                            getEntityName,
                            timeScaleGroupRef,
                        },
                        false,
                    )
                }
                break
            }

            case "damage":
                entities.push(createSingleNoteEntity(object, timeScaleGroupRef(object.timeScaleGroup)))
                break

            default:
                assertNever(object)
        }
    }

    appendSimLines({
        entities,
        allowSimLines,
        getEntityName,
    })

    return {
        bgmOffset: usc.offset + offset,
        entities,
    }
}

function prepareTimeScaleGroups(
    usc: USC,
    ensureTimeScaleGroup: (index: number) => LevelDataEntity,
    timeScaleChangesByGroup: USCTimeScaleGroupChange[][],
) {
    for (const object of usc.objects) {
        switch (object.type) {
            case "timeScaleGroup": {
                const index = timeScaleChangesByGroup.length
                timeScaleChangesByGroup.push([...object.changes].sort((a, b) => a.beat - b.beat))
                ensureTimeScaleGroup(index)
                break
            }

            case "single":
            case "damage":
                ensureTimeScaleGroup(object.timeScaleGroup)
                break

            case "slide": {
                let previousGroup = 0
                for (const connection of object.connections) {
                    previousGroup = getConnectionTimeScaleGroup(connection, previousGroup)
                    ensureTimeScaleGroup(previousGroup)
                }
                break
            }

            case "guide":
                for (const midpoint of object.midpoints) {
                    ensureTimeScaleGroup(midpoint.timeScaleGroup)
                }
                break
        }
    }

    ensureTimeScaleGroup(0)
}

function createBpmChangeEntity(beat: number, bpm: number): LevelDataEntity {
    return {
        archetype: EngineArchetypeName.BpmChange,
        data: [
            valueData(EngineArchetypeDataName.Beat, beat),
            valueData(EngineArchetypeDataName.Bpm, bpm),
        ],
    }
}

function createSingleNoteEntity(note: USCSingleNote | USCDamageNote, timeScaleGroupRef: string): LevelDataEntity {
    const critical = note.type === "single" && note.critical
    return {
        archetype: note.type === "damage" ? "DamageNote" : getSingleNoteArchetype(note),
        data: [
            refData("#TIMESCALE_GROUP", timeScaleGroupRef),
            valueData(EngineArchetypeDataName.Beat, note.beat),
            valueData("lane", note.lane),
            valueData("size", note.size),
            valueData("direction", note.type === "damage" ? 0 : flickDirections[note.direction ?? "none"]),
            valueData("isAttached", 0),
            valueData("isSeparator", 0),
            valueData("connectorEase", 1),
            valueData("segmentKind", critical ? 2 : 1),
            valueData("segmentAlpha", 1),
            valueData("segmentLayer", 0),
            valueData("effectKind", 0),
            valueData("segmentThroughJudgeLine", 0),
            valueData("segmentPresentation", 0),
        ],
    }
}

function convertSlideNote(
    note: SlideLike,
    context: {
        entities: LevelDataEntity[]
        allowSimLines: Map<number, SimLineCandidate[]>
        getEntityName: (entity: LevelDataEntity) => string
        timeScaleGroupRef: (index: number) => string
    },
    active = true,
) {
    let previousConnection: LevelDataEntity | undefined
    let previousSegmentHead: LevelDataEntity | undefined
    let previousSegmentHeadConnection: USCSlideConnection | undefined
    let previousSegmentHeadBeat = 0
    let previousTimeScaleGroup = 0
    let head: LevelDataEntity | undefined
    let headBeat: number | undefined
    let tail: LevelDataEntity | undefined
    let attaches: SlideAttach[] = []
    const segments: SlideSegment[] = []

    for (const [index, connection] of note.connections.entries()) {
        previousTimeScaleGroup = getConnectionTimeScaleGroup(connection, previousTimeScaleGroup)

        const entity = createSlideConnectionEntity({
            connection,
            slide: note,
            active,
            index,
            timeScaleGroupRef: context.timeScaleGroupRef(previousTimeScaleGroup),
        })

        if (canCreateSimLine(connection)) {
            addSimLineCandidate(context.allowSimLines, connection.beat, connection.lane, entity)
        }

        head ??= entity
        headBeat ??= connection.beat
        tail = entity

        previousConnection?.data.push(refData("next", context.getEntityName(entity)))

        if (connection.type !== "attach" && previousSegmentHead && previousSegmentHeadConnection) {
            segments.push({
                head: previousSegmentHead,
                tail: entity,
                headConnection: previousSegmentHeadConnection,
                tailConnection: connection,
                headBeat: previousSegmentHeadBeat,
                tailBeat: connection.beat,
                attaches,
            })
            attaches = []
        }

        if (connection.type === "attach") {
            attaches.push({ connection, entity })
        } else {
            previousSegmentHead = entity
            previousSegmentHeadConnection = connection
            previousSegmentHeadBeat = connection.beat
        }

        if (active && index === note.connections.length - 1) {
            entity.data.push(refData("activeHead", context.getEntityName(head)))
        }
        previousConnection = entity
        context.entities.push(entity)
    }

    if (!head) throw new Error("Unexpected missing head")
    if (!tail) throw new Error("Unexpected missing tail")

    for (const segment of segments) {
        const attachHeadRef = context.getEntityName(segment.head)
        const attachTailRef = context.getEntityName(segment.tail)
        for (const attach of segment.attaches) {
            const interpolated = interpolateSlideConnection(
                attach.connection.beat,
                segment.headConnection,
                segment.tailConnection,
            )
            const attachConnection = attach.connection as USCSlideAttachConnectionWithPosition
            const zeroDuration = segment.headConnection.beat === segment.tailConnection.beat
            setValueData(
                attach.entity,
                "lane",
                zeroDuration && attachConnection.lane !== undefined ? attachConnection.lane : interpolated.lane,
            )
            setValueData(
                attach.entity,
                "size",
                zeroDuration && attachConnection.size !== undefined ? attachConnection.size : interpolated.size,
            )
            attach.entity.data.push(
                refData("attachHead", attachHeadRef),
                refData("attachTail", attachTailRef),
            )
        }

        if (active) {
            appendTransientHiddenTicks({
                entities: context.entities,
                attachHead: segment.head,
                attachTail: segment.tail,
                attachHeadBeat: segment.headBeat,
                attachTailBeat: segment.tailBeat,
                headBeat,
                getEntityName: context.getEntityName,
            })
        }

        context.entities.push(
            createConnectorEntity({
                active,
                head,
                tail,
                headRef: context.getEntityName(segment.head),
                tailRef: context.getEntityName(segment.tail),
                getEntityName: context.getEntityName,
            }),
        )
    }
}

function createSlideConnectionEntity({
    connection,
    slide,
    active,
    index,
    timeScaleGroupRef,
}: {
    connection: USCSlideConnection
    slide: SlideLike
    active: boolean
    index: number
    timeScaleGroupRef: string
}): LevelDataEntity {
    return {
        archetype: getSlideConnectionArchetype(connection),
        data: [
            refData("#TIMESCALE_GROUP", timeScaleGroupRef),
            valueData(EngineArchetypeDataName.Beat, connection.beat),
            valueData("lane", getSlideConnectionLane(connection)),
            valueData("size", getSlideConnectionSize(connection)),
            valueData("direction", getSlideConnectionDirection(connection)),
            valueData("isAttached", Number(connection.type === "attach")),
            valueData("isSeparator", 0),
            valueData("connectorEase", getSlideConnectionEase(connection)),
            valueData("segmentKind", getSegmentKind(slide.critical, active, slide.guideColor)),
            valueData(
                "segmentAlpha",
                getSegmentAlpha(
                    slide.connections.length,
                    index,
                    active,
                    slide.guideColor,
                    slide.guideFade,
                ),
            ),
            valueData("segmentLayer", 0),
            valueData("effectKind", 0),
            valueData("segmentThroughJudgeLine", 0),
            valueData("segmentPresentation", 0),
        ],
    }
}

function createGuideSlide(guide: USCGuideNote): SlideLike | undefined {
    if (guide.midpoints.length < 2) return

    const critical = guide.color === "yellow"
    const lastIndex = guide.midpoints.length - 1
    const connections = guide.midpoints.map((midpoint, index): USCSlideConnection => {
        if (index === 0) {
            return {
                type: "start",
                beat: midpoint.beat,
                lane: midpoint.lane,
                size: midpoint.size,
                timeScaleGroup: midpoint.timeScaleGroup,
                critical,
                ease: midpoint.ease,
                judgeType: "none",
            }
        }

        if (index === lastIndex) {
            return {
                type: "end",
                beat: midpoint.beat,
                lane: midpoint.lane,
                size: midpoint.size,
                timeScaleGroup: midpoint.timeScaleGroup,
                critical,
                judgeType: "none",
            }
        }

        return {
            type: "tick",
            beat: midpoint.beat,
            lane: midpoint.lane,
            size: midpoint.size,
            timeScaleGroup: midpoint.timeScaleGroup,
            ease: midpoint.ease,
        }
    })

    return {
        critical,
        guideColor: guide.color,
        guideFade: guide.fade,
        connections,
    }
}

function appendTransientHiddenTicks({
    entities,
    attachHead,
    attachTail,
    attachHeadBeat,
    attachTailBeat,
    headBeat,
    getEntityName,
}: {
    entities: LevelDataEntity[]
    attachHead: LevelDataEntity
    attachTail: LevelDataEntity
    attachHeadBeat: number
    attachTailBeat: number
    headBeat: number | undefined
    getEntityName: (entity: LevelDataEntity) => string
}) {
    for (let beat = Math.ceil(attachHeadBeat / 0.5) * 0.5; beat < attachTailBeat; beat += 0.5) {
        if (beat === headBeat) continue

        entities.push({
            archetype: "TransientHiddenTickNote",
            data: [
                valueData(EngineArchetypeDataName.Beat, beat),
                valueData("isAttached", 1),
                refData("attachHead", getEntityName(attachHead)),
                refData("attachTail", getEntityName(attachTail)),
            ],
        })
    }
}

function createConnectorEntity({
    active,
    head,
    tail,
    headRef,
    tailRef,
    getEntityName,
}: {
    active: boolean
    head: LevelDataEntity
    tail: LevelDataEntity
    headRef: string
    tailRef: string
    getEntityName: (entity: LevelDataEntity) => string
}): LevelDataEntity {
    if (!active) {
        return {
            archetype: "Connector",
            data: [
                refData("head", headRef),
                refData("tail", tailRef),
                refData("segmentHead", getEntityName(head)),
                refData("segmentTail", getEntityName(tail)),
            ],
        }
    }

    return {
        archetype: "Connector",
        data: [
            refData("head", headRef),
            refData("tail", tailRef),
            refData("segmentHead", getEntityName(head)),
            refData("segmentTail", getEntityName(tail)),
            refData("activeHead", getEntityName(head)),
            refData("activeTail", getEntityName(tail)),
        ],
    }
}

function appendTimeScaleChanges({
    entities,
    timeScaleGroups,
    timeScaleChangesByGroup,
    getEntityName,
}: {
    entities: LevelDataEntity[]
    timeScaleGroups: LevelDataEntity[]
    timeScaleChangesByGroup: USCTimeScaleGroupChange[][]
    getEntityName: (entity: LevelDataEntity) => string
}) {
    for (const [groupIndex, changes] of timeScaleChangesByGroup.entries()) {
        let previous: LevelDataEntity | undefined

        for (const change of changes) {
            const entity = createTimeScaleChangeEntity(change, getEntityName(timeScaleGroups[groupIndex]))

            if (previous) {
                previous.data.push(refData("next", getEntityName(entity)))
            } else {
                timeScaleGroups[groupIndex].data.push(refData("first", getEntityName(entity)))
            }

            previous = entity
            entities.push(entity)
        }
    }
}

function createTimeScaleChangeEntity(
    change: USCTimeScaleGroupChange,
    timeScaleGroupRef: string,
): LevelDataEntity {
    return {
        archetype: EngineArchetypeName.TimeScaleChange,
        data: [
            refData("#TIMESCALE_GROUP", timeScaleGroupRef),
            valueData(EngineArchetypeDataName.Beat, change.beat),
            valueData("editorLane", -6),
            valueData(EngineArchetypeDataName.TimeScale, change.timeScale),
            valueData("#TIMESCALE_SKIP", 0),
            valueData("#TIMESCALE_EASE", 0),
            valueData("hideNotes", 0),
        ],
    }
}

function appendSimLines({
    entities,
    allowSimLines,
    getEntityName,
}: {
    entities: LevelDataEntity[]
    allowSimLines: Map<number, SimLineCandidate[]>
    getEntityName: (entity: LevelDataEntity) => string
}) {
    for (const notes of allowSimLines.values()) {
        if (notes.length < 2) continue

        notes.sort((a, b) => a.lane - b.lane)

        let previous: LevelDataEntity | undefined
        for (const { entity } of notes) {
            if (previous) {
                entities.push({
                    archetype: "SimLine",
                    data: [
                        refData("left", getEntityName(previous)),
                        refData("right", getEntityName(entity)),
                    ],
                })
            }

            previous = entity
        }
    }
}

function addSimLineCandidate(
    allowSimLines: Map<number, SimLineCandidate[]>,
    beat: number,
    lane: number,
    entity: LevelDataEntity,
) {
    const notes = allowSimLines.get(beat)
    if (notes) {
        notes.push({ lane, entity })
    } else {
        allowSimLines.set(beat, [{ lane, entity }])
    }
}

function getSingleNoteArchetype(note: USCSingleNote) {
    return `${note.critical ? "Critical" : "Normal"}${
        note.trace ? (isFlick(note.direction) ? "TraceFlick" : "Trace") : isFlick(note.direction) ? "Flick" : "Tap"
    }Note`
}

function getSlideConnectionArchetype(connection: USCSlideConnection) {
    if (isAnchorConnection(connection)) return "AnchorNote"

    const prefix = connection.critical ? "Critical" : "Normal"

    switch (connection.type) {
        case "start":
            return `${prefix}${connection.judgeType === "trace" ? "HeadTrace" : "HeadTap"}Note`

        case "tick":
            return `${prefix}${connection.critical === undefined ? "Trace" : "Tick"}Note`

        case "attach":
            return `${prefix}TickNote`

        case "end":
            return `${prefix}${
                connection.judgeType === "trace"
                    ? isFlick(connection.direction)
                        ? "TailTraceFlick"
                        : "TailTrace"
                    : isFlick(connection.direction)
                      ? "TailFlick"
                      : "TailRelease"
            }Note`
    }
}

function getSlideConnectionDirection(connection: USCSlideConnection) {
    return connection.type === "end" ? flickDirections[connection.direction ?? "none"] : 0
}

function getSlideConnectionLane(connection: USCSlideConnection) {
    if (connection.type === "attach") {
        return (connection as USCSlideAttachConnectionWithPosition).lane ?? 0
    }

    return connection.lane
}

function getSlideConnectionSize(connection: USCSlideConnection) {
    if (connection.type === "attach") {
        return (connection as USCSlideAttachConnectionWithPosition).size ?? 0
    }

    return connection.size
}

function getSlideConnectionEase(connection: USCSlideConnection) {
    return connection.type === "start" || connection.type === "tick"
        ? connectorEases[connection.ease]
        : 1
}

function interpolateSlideConnection(
    beat: number,
    headConnection: USCSlideConnection,
    tailConnection: USCSlideConnection,
) {
    if (headConnection.type === "attach" || tailConnection.type === "attach") {
        throw new Error("Unexpected attach connection in slide segment")
    }

    const beatRange = tailConnection.beat - headConnection.beat
    const progress = beatRange === 0 ? 0 : (beat - headConnection.beat) / beatRange
    const easedProgress = easeProgress(progress, getRawSlideConnectionEase(headConnection))

    return {
        lane: interpolate(headConnection.lane, tailConnection.lane, easedProgress),
        size: interpolate(headConnection.size, tailConnection.size, easedProgress),
    }
}

function easeProgress(progress: number, ease: USCSlideEase) {
    switch (ease) {
        case "in":
            return progress * progress
        case "out":
            return 1 - (1 - progress) * (1 - progress)
        case "inout":
            return progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2
        case "linear":
            return progress
    }
}

function getRawSlideConnectionEase(connection: USCSlideConnection) {
    return connection.type === "start" || connection.type === "tick"
        ? (connection.ease as USCSlideEase)
        : "linear"
}

function interpolate(from: number, to: number, progress: number) {
    return from + (to - from) * progress
}

function getSegmentKind(critical: boolean, active: boolean, guideColor?: USCGuideNote["color"]) {
    if (guideColor) return guideSegmentKinds[guideColor]
    if (active) return critical ? 2 : 1
    return critical ? 105 : 103
}

function getSegmentAlpha(
    connectionCount: number,
    index: number,
    active: boolean,
    guideColor?: USCGuideNote["color"],
    guideFade?: USCGuideNote["fade"],
) {
    if (active) return 1
    if (connectionCount < 2) return 1

    if (guideColor) {
        switch (guideFade) {
            case "in":
                return index === 0 ? 0 : 1
            case "out":
                return index === 0 ? 1 : 0
            case "none":
                return 1
            default:
                return 1
        }
    }

    const progress = index / (connectionCount - 1)

    return (1 - progress) * 1 + progress * 0.2
}

function getConnectionTimeScaleGroup(connection: USCSlideConnection, fallback: number) {
    return connection.timeScaleGroup ?? fallback
}

function canCreateSimLine(connection: USCSlideConnection): connection is Exclude<USCSlideConnection, { type: "attach" }> {
    if (isAnchorConnection(connection)) return false
    return connection.type === "start" || connection.type === "end"
}

function isAnchorConnection(connection: USCSlideConnection) {
    return (
        (connection.type === "tick" && connection.critical === undefined) ||
        ((connection.type === "start" || connection.type === "end") &&
            connection.judgeType === "none")
    )
}

function isFlick(direction: USCSingleNote["direction"]) {
    return direction !== undefined && direction !== "none"
}

function valueData(name: LevelDataEntityData["name"], value: number): LevelDataEntityData {
    return { name, value }
}

function refData(name: LevelDataEntityData["name"], ref: string): LevelDataEntityData {
    return { name, ref }
}

function setValueData(entity: LevelDataEntity, name: LevelDataEntityData["name"], value: number) {
    const data = entity.data.find((item) => item.name === name)
    if (!data || !("value" in data)) {
        throw new Error(`Unexpected missing value data: ${name}`)
    }

    data.value = value
}

function assertNever(value: never): never {
    throw new TypeError(`Unexpected USC object: ${JSON.stringify(value)}`)
}

const flickDirections = {
    none: 0,
    up: 0,
    left: 1,
    right: 2,
} as const

const connectorEases = {
    linear: 1,
    in: 2,
    out: 3,
    inout: 4,
} as const

const guideSegmentKinds = {
    neutral: 101,
    red: 102,
    green: 103,
    blue: 104,
    yellow: 105,
    purple: 106,
    cyan: 107,
    black: 108,
} as const