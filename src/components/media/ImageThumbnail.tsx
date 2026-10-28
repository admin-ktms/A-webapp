
import { useState } from "react";
import { Image as ImageIcon, LoaderCircle } from "lucide-react";
import type { ImageThumbnailProps } from "./imageViewer.types";

export default function ImageThumbnail({
  image,
  onClick,
  className = "",
}: ImageThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={failed}
      aria-label={`View image: ${image.alt}`}
      className={[
        "group relative block overflow-hidden rounded-lg",
        "border border-[#2A3342] bg-[#11151D]",
        "focus:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#00D9FF]",
        className,
      ].join(" ")}
    >
      {!failed && (
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={[
            "h-full w-full object-cover transition-opacity duration-200",
            "group-hover:opacity-80",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      )}

      {!loaded && !failed && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#A5AFBF]"
            aria-label="Loading image"
          />
        </span>
      )}

      {failed && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-[#A5AFBF]">
          <ImageIcon size={22} />
          <span className="text-xs">Image unavailable</span>
        </span>
      )}

      {loaded && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1 text-left text-xs text-[#F5F7FA]">
          {image.label || "View image"}
        </span>
      )}
    </button>
  );
}
