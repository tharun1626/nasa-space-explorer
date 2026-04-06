export const transformNeoData = (neoResponse) => {
  const byDate = neoResponse.near_earth_objects || {};

  const flattened = Object.entries(byDate).flatMap(([date, asteroids]) =>
    asteroids.map((item) => ({
      id: item.id,
      name: item.name,
      date,
      hazardous: item.is_potentially_hazardous_asteroid,
      magnitude: item.absolute_magnitude_h,
      diameterMin: item.estimated_diameter.kilometers.estimated_diameter_min,
      diameterMax: item.estimated_diameter.kilometers.estimated_diameter_max,
      closeApproachDate: item.close_approach_data?.[0]?.close_approach_date || null,
      velocityKph: Number(
        item.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour || 0
      ),
      missDistanceKm: Number(
        item.close_approach_data?.[0]?.miss_distance?.kilometers || 0
      )
    }))
  );

  const summary = {
    total: flattened.length,
    hazardous: flattened.filter((a) => a.hazardous).length,
    fastest: flattened.reduce(
      (max, item) => (item.velocityKph > (max.velocityKph || 0) ? item : max),
      {}
    ),
    closest: flattened.reduce(
      (min, item) => (item.missDistanceKm < (min.missDistanceKm || Infinity) ? item : min),
      {}
    )
  };

  const chartData = Object.entries(byDate).map(([date, asteroids]) => ({
    date,
    total: asteroids.length,
    hazardous: asteroids.filter((a) => a.is_potentially_hazardous_asteroid).length
  }));

  return { summary, chartData, asteroids: flattened };
};