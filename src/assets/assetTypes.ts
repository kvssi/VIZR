export type AssetType = 'bg' | 'poster' | 'overlay' | 'logo' | 'flash';
export type AssetAspect = 'landscape' | 'portrait' | 'square';
export type AssetColor = 'mono' | 'accent' | 'color';
export type AssetBehavior = 'frequent' | 'rare' | 'peak';

export interface ImageMetadata {
  type: AssetType;
  aspect: AssetAspect;
  color: AssetColor;
  behavior: AssetBehavior;
}

export interface AssetItem {
  image: HTMLImageElement;
  metadata: ImageMetadata;
  file: File;
}
