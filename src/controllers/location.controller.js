import {
  listProvinces,
  listRegenciesByProvince,
} from "../services/location.service.js";

export const getProvincesHandler = async (req, res, next) => {
  try {
    const data = await listProvinces(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getRegenciesByProvinceHandler = async (req, res, next) => {
  try {
    const data = await listRegenciesByProvince(
      req.params.provinceId,
      req.query
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};
