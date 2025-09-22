"use client";

import React, { useState } from "react";

export type ImageProps = {
  data: string;
  mimeType: string;
  fileName: string;
}

interface ImageUploadProps {
  onImageChange: (image: ImageProps | undefined) => void;
  initialImage?: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageChange,
  initialImage = null,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);

        const image: ImageProps = {
          data: result,
          fileName: file.name,
          mimeType: file.type,
        }

        onImageChange(image);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[#522c77]">
        Profile Image
      </label>
      <div className="mt-1 flex justify-center">
        <div className="relative">
          <div className="h-20 w-20 rounded-lg border-2 border-dashed border-[#e7dbf9] flex items-center justify-center">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <svg
                className="h-6 w-6 text-[#bb96ea]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
          </div>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleImageChange}
            accept="image/*"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
