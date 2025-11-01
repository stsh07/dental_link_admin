// src/popups/addService.tsx
import { useState, ChangeEvent } from "react";
import AddedSuccessfully from "./serviceAddedSuccessful";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (svc: any) => void;
};

export default function AddService({ open, onClose, onCreated }: Props) {
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const maxDescriptionLength = 500;

  if (!open) return null;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!serviceName.trim()) {
      alert("Service name is required");
      return;
    }
    const fd = new FormData();
    fd.append("name", serviceName.trim());
    fd.append("description", serviceDescription.trim());
    if (selectedImage) fd.append("image", selectedImage);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create service");
      }
      onCreated(json.data);
      setServiceName("");
      setServiceDescription("");
      setSelectedImage(null);
      setImagePreview("");
      setSuccessOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70 p-4">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold">New Service</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-lg"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg sm:text-xl">Upload service image</h2>
              <div className="relative w-full aspect-[546/392] bg-slate-100 flex items-center justify-center rounded-lg overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Service preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer bg-white rounded-[10px] px-8 py-3 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <span className="text-gray-500 text-[15px] font-semibold">
                      Choose image
                    </span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}

                {imagePreview && (
                  <label
                    htmlFor="image-upload-change"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 cursor-pointer bg-white rounded-[10px] px-8 py-3 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <span className="text-gray-500 text-[15px] font-semibold">
                      Change image
                    </span>
                    <input
                      id="image-upload-change"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label htmlFor="service-name" className="mb-2 text-base">
                Service Name
              </label>
              <input
                id="service-name"
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-4 py-3 mb-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30b8de]"
              />

              <label htmlFor="service-description" className="mb-2 text-base">
                Service Description
              </label>
              <div className="relative mb-6">
                <textarea
                  id="service-description"
                  value={serviceDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= maxDescriptionLength) {
                      setServiceDescription(e.target.value);
                    }
                  }}
                  placeholder="Write here..."
                  className="w-full h-48 px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#30b8de]"
                />
                <div className="absolute bottom-3 right-4 text-[#30b8de] text-base">
                  {serviceDescription.length}/{maxDescriptionLength}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#30b8de] text-white px-10 py-3 rounded-full text-sm font-semibold hover:bg-[#2AA3C4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Add service"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddedSuccessfully open={successOpen} onClose={handleSuccessClose} />
    </>
  );
}
