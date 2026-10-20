from dataclasses import dataclass



@dataclass
class UploadData:
    key: str
    data: bytes