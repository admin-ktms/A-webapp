
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ImageViewerProps } from "./imageViewer.types";

export default function ImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  allowDownload = false,
}: ImageViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasImages = images.length > 0;
  const safeIndex = hasImages
    ? Math.min(Math.max(activeIndex, 0), images.length - 1)
    : 0;
  const currentImage = hasImages ? images[safeIndex] : undefined;
  const canNavigate = images.length > 1;

  const goPrevious = useCallback(() => {
    if (images.length <= 1) return;

    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;

    setActiveIndex((index) => (index + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveIndex(
      Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
    );
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [currentImage?.src]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && canNavigate) {
        goPrevious();
      } else if (event.key === "ArrowRight" && canNavigate) {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, canNavigate, goPrevious, goNext]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[100] flex flex-col bg-[#080A0F]/95"
      onClick={onClose}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2A3342] bg-[#11151D] px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#F5F7FA]">
            {currentImage?.label || currentImage?.alt || "Image preview"}
          </p>

          {hasImages && (
            <p className="text-xs text-[#A5AFBF]">
              {safeIndex + 1} of {images.length}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {allowDownload && currentImage && (
            <a
              href={currentImage.src}
              download
              target="_blank"
              rel="noreferrer"
              aria-label="Download or open image"
              className="rounded-lg p-2 text-[#A5AFBF] hover:bg-[#1A2230] hover:text-[#00D9FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              <Download size={20} />
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="rounded-lg p-2 text-[#A5AFBF] hover:bg-[#1A2230] hover:text-[#F5F7FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {!hasImages || !currentImage ? (
          <div className="flex flex-col items-center gap-3 text-[#A5AFBF]">
            <AlertCircle size={28} />
            <p>No images are available.</p>
          </div>
        ) : (
          <>
            {canNavigate && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrevious();
                }}
                aria-label="Previous image"
                className="absolute left-2 z-10 rounded-full border border-[#2A3342] bg-[#11151D]/90 p-2 text-[#F5F7FA] hover:bg-[#1A2230] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:left-5 sm:p-3"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div
              className="relative flex h-full w-full items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              {!loaded && !failed && (
                <LoaderCircle
                  size={32}
                  className="absolute animate-spin text-[#00D9FF]"
                  aria-label="Loading image"
                />
              )}

              {failed ? (
                <div className="flex flex-col items-center gap-3 text-center text-[#A5AFBF]">
                  <AlertCircle size={32} />
                  <p className="text-sm text-[#F5F7FA]">
                    This image could not be loaded.
                  </p>
                  <p className="max-w-sm text-xs">
                    The link may have expired or access may no longer be
                    available. Close the viewer and reload the image from its
                    source.
                  </p>
                </div>
              ) : (
                <img
                  key={currentImage.src}
                  src={currentImage.src}
                  alt={currentImage.alt}
                  onLoad={() => setLoaded(true)}
                  onError={() => setFailed(true)}
                  className={[
                    "max-h-full max-w-full select-none object-contain",
                    loaded ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
              )}
            </div>

            {canNavigate && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                aria-label="Next image"
                className="absolute right-2 z-10 rounded-full border border-[#2A3342] bg-[#11151D]/90 p-2 text-[#F5F7FA] hover:bg-[#1A2230] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:right-5 sm:p-3"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </>
        )}
      </main>

      {currentImage?.label && (
        <footer
          className="shrink-0 border-t border-[#2A3342] bg-[#11151D] px-4 py-3 text-center text-sm text-[#A5AFBF]"
          onClick={(event) => event.stopPropagation()}
        >
          {currentImage.label}
        </footer>
      )}
    </div>
  );
}
