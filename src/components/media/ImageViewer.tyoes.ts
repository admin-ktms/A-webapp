
export interface ImageViewerImage {
  /** A URL obtained through the feature's authorized image service. */
  src: string;
  /** Accessible description of the image. */
  alt: string;
  /** Optional short caption shown below the image. */
  label?: string;
}

export interface ImageViewerProps {
  images: ImageViewerImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  /** Downloads are disabled unless the caller explicitly enables them. */
  allowDownload?: boolean;
}

export interface ImageThumbnailProps {
  image: ImageViewerImage;
  onClick: () => void;
  className?: string;
}
