const Joi = require('joi');

const convertSchema = Joi.object({
  input: Joi.string().required(),
  scale: Joi.number().min(0.1).max(2).default(1),
  cHeight: Joi.number().min(0.1).max(2).default(1),
  cWidth: Joi.number().min(0.1).max(2).default(1),
  format: Joi.string().valid('A4', 'A3', 'Letter').default('A4'),
  orientation: Joi.string().valid('portrait', 'landscape').default('portrait')
});

exports.validateConvertRequest = (req, res, next) => {
  const { error } = convertSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};