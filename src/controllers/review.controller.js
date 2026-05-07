import {
  createReview,
  getMyReviews,
  getProviderReviews,
} from "../services/review.service.js";

export const createReviewHandler = async (req, res, next) => {
  try {
    const review = await createReview(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Review created",
      data: { review },
    });
  } catch (err) {
    return next(err);
  }
};

export const getProviderReviewsHandler = async (req, res, next) => {
  try {
    const data = await getProviderReviews(req.params.providerId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getMyReviewsHandler = async (req, res, next) => {
  try {
    const data = await getMyReviews(req.user, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};
