export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const status = err.response?.status || err.status || 500;
  const message =
    err.response?.data?.error?.message ||
    err.message ||
    "Internal server error";

  res.status(status).json({ message });
};