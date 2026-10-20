/**
 * NextSekaiのエンジンに従事したLevelDataの型定義。
 * Type definition of LevelData for NextSekai's engine.
 */

export const EngineArchetypeName = {
    BpmChange: "#BPM_CHANGE",
    TimeScaleChange: "#TIMESCALE_CHANGE",
} as const

export type EngineArchetypeName =
    (typeof EngineArchetypeName)[keyof typeof EngineArchetypeName]

export const EngineArchetypeDataName = {
    Beat: "#BEAT",
    Bpm: "#BPM",
    TimeScale: "#TIMESCALE",
    Judgment: "#JUDGMENT",
    Accuracy: "#ACCURACY",
} as const

export type EngineArchetypeDataName =
    (typeof EngineArchetypeDataName)[keyof typeof EngineArchetypeDataName]

export type LevelData = {
    bgmOffset: number
    entities: LevelDataEntity[]
}

export type LevelDataEntity = {
    name?: string
    archetype: LevelDataArchetypeName
    data: LevelDataEntityData[]
}

export type LevelDataEntityData = LevelDataValueData | LevelDataRefData

export type LevelDataValueData = {
    name: LevelDataEntityDataName
    value: number
}

export type LevelDataRefData = {
    name: LevelDataEntityDataName
    ref: string
}

export type LevelDataArchetypeName =
    | EngineArchetypeName
    | NextSekaiLevelDataArchetypeName
    | (string & {})

export type LevelDataEntityDataName =
    | EngineArchetypeDataName
    | NextSekaiLevelDataEntityDataName
    | (string & {})

export type NextSekaiLevelDataArchetypeName =
    | "Initialization"
    | "#TIMESCALE_GROUP"
    | "NormalTapNote"
    | "DamageNote"
    | "CriticalTapNote"
    | "NormalFlickNote"
    | "CriticalFlickNote"
    | "NormalTraceNote"
    | "CriticalTraceNote"
    | "NormalTraceFlickNote"
    | "CriticalTraceFlickNote"
    | "NormalHeadTapNote"
    | "CriticalHeadTapNote"
    | "NormalHeadTraceNote"
    | "CriticalHeadTraceNote"
    | "NormalTickNote"
    | "CriticalTickNote"
    | "NormalTailReleaseNote"
    | "CriticalTailReleaseNote"
    | "NormalTailFlickNote"
    | "CriticalTailFlickNote"
    | "NormalTailTraceNote"
    | "CriticalTailTraceNote"
    | "NormalTailTraceFlickNote"
    | "CriticalTailTraceFlickNote"
    | "AnchorNote"
    | "TransientHiddenTickNote"
    | "Connector"
    | "SimLine"

export type NextSekaiLevelDataEntityDataName =
    | "#TIMESCALE_GROUP"
    | "#TIMESCALE_SKIP"
    | "#TIMESCALE_EASE"
    | "lane"
    | "size"
    | "direction"
    | "isAttached"
    | "isSeparator"
    | "connectorEase"
    | "segmentKind"
    | "segmentAlpha"
    | "segmentLayer"
    | "effectKind"
    | "hideNotes"
    | "initialLife"
    | "editorName"
    | "editorLane"
    | "first"
    | "next"
    | "head"
    | "tail"
    | "left"
    | "right"
    | "activeHead"
    | "activeTail"
    | "attachHead"
    | "attachTail"
    | "segmentHead"
    | "segmentTail"
    | "segmentThroughJudgeLine"
    | "segmentPresentation"