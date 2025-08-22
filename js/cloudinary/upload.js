
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfckxxocs/image/upload";
const UPLOAD_PRESET = "dpflsite";

/**
 * 파일을 Cloudinary에 업로드하고 이미지 URL을 반환합니다.
 * @param {File} file - 업로드할 파일 객체
 * @returns {Promise<string|null>} - 업로드 성공 시 이미지의 secure URL, 실패 시 null
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
}
