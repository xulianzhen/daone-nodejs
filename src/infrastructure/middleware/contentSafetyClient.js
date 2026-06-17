import { appConfig } from "../config/env.js";

export async function reviewAsset(asset) {
  if (appConfig.contentSafety.mockEnabled) {
    return { status: "AVAILABLE", mock: true };
  }
  if (!appConfig.contentSafety.endpoint) {
    return { status: "REVIEWING", reason: "CONTENT_SAFETY_ENDPOINT_NOT_CONFIGURED" };
  }
  const response = await fetch(appConfig.contentSafety.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: appConfig.contentSafety.apiKey ? `Bearer ${appConfig.contentSafety.apiKey}` : ""
    },
    body: JSON.stringify({
      assetId: asset.id,
      objectKey: asset.objectKey,
      previewUrl: asset.previewUrl,
      contentType: asset.contentType,
      type: asset.type
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Content safety failed: ${response.status}`);
  }
  return {
    status: ["AVAILABLE", "REVIEWING", "REJECTED"].includes(result.status) ? result.status : "REVIEWING",
    reason: result.reason || null,
    raw: result
  };
}
