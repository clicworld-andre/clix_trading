/**
 * Matrix API helper functions
 */

/**
 * Properly leave and forget a room in Matrix
 * This is a helper function to handle the process of leaving and forgetting a room
 * which might require multiple API calls
 */
export async function leaveAndForgetRoom(client: any, roomId: string): Promise<void> {
  try {
    // First attempt to leave the room via client API
    await client.leave(roomId);
    console.log(`Successfully left room ${roomId}`);
    
    try {
      // Then attempt to forget the room
      await client.forget(roomId);
      console.log(`Successfully forgot room ${roomId}`);
    } catch (forgetError) {
      console.warn(`Could not forget room ${roomId}, but leave was successful:`, forgetError);
    }
  } catch (error: any) {
    console.error(`Error leaving room ${roomId}:`, error);
    
    // If the error is due to not being in the room already, we can try to just forget it
    if (error?.data?.errcode === 'M_NOT_MEMBER' || error?.data?.error === 'Not a member') {
      try {
        await client.forget(roomId);
        console.log(`Successfully forgot room ${roomId} after failed leave`);
        return; // Success after recovery
      } catch (forgetError) {
        console.error(`Also failed to forget room ${roomId}:`, forgetError);
      }
    }
    
    // If we get here, both attempts failed
    throw error;
  }
} 