import { appConfig } from "../config/env.js";

export async function createProviderGenerationTask(task, capability) {
  if (appConfig.model.mockEnabled) {
    return null;
  }
  const response = await fetch(appConfig.model.endpoint.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${appConfig.model.apiKey}`
    },
    body: JSON.stringify({
      idempotencyKey: task.idempotencyKey,
      taskId: task.id,
      projectId: task.projectId,
      nodeId: task.nodeId,
      taskType: task.taskType,
      capabilityCode: task.capabilityCode,
      capability,
      prompt: task.prompt,
      parameters: task.parameters,
      referenceAssetIds: task.referenceAssetIds
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Model provider failed: ${response.status}`);
  }
  return {
    providerTaskId: result.providerTaskId || result.id || null,
    status: normalizeStatus(result.status),
    progress: Number(result.progress ?? 0),
    results: Array.isArray(result.results) ? result.results : [],
    raw: result
  };
}

function normalizeStatus(status) {
  if (["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELED"].includes(status)) {
    return status;
  }
  return "QUEUED";
}
