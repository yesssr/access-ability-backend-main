import {
  getMyMatchingHistory,
  getRecommendations,
} from "../services/matching.service.js";

export const getRecommendationsHandler = async (req, res, next) => {
  try {
    const data = await getRecommendations(req.user, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getMyMatchingHistoryHandler = async (req, res, next) => {
  try {
    const data = await getMyMatchingHistory(req.user, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};
