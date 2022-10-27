/**
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function storePointsVariable() {
  webgazer.params.storingPoints = true;
}

/**
 * Sets store_points to false, so prediction points aren't
 * stored any more
 */
function stopStoringPointsVariable() {
  webgazer.params.storingPoints = false;
}
