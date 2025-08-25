// Utility functions for Matrix ID handling to match production
export const getCleanMatrixId = (fullMatrixId: string): string => {
  // Production uses simple cleaning: remove @ and take username part only
  return fullMatrixId
    .replace(/^@/, "") // Remove leading @
    .split(":")[0] // Remove domain part
    // Production doesn't use aggressive regex cleaning
}

export const getJwtToken = (): string | null => {
  if (typeof window === 'undefined') return null

  // Prefer a user-scoped token first if one exists
  const rawId = localStorage.getItem('matrix_user_id')
  if (rawId) {
    // Try scoped key with full id first
    const scopedFull = localStorage.getItem(`jwt_${rawId}`)
    if (scopedFull) return scopedFull

    // Then try username without @ and domain
    const clean = getCleanMatrixId(rawId)
    const scopedClean = localStorage.getItem(`jwt_${clean}`)
    if (scopedClean) return scopedClean
  }

  // Fallback to generic key
  return localStorage.getItem('jwt')
}
