const Joi = require('joi');

const convertSchema = Joi.object({
  input: Joi.string().when('$hasFile', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  scale: Joi.number().min(0.1).max(2).default(1.0),
  format: Joi.string().valid('A4', 'A3', 'Letter').default('A4'),
  orientation: Joi.string().valid('portrait', 'landscape').default('portrait')
}).options({ stripUnknown: true });

exports.validateConvertRequest = (req, res, next) => {
  const { error, value } = convertSchema.validate(req.body, {
    context: {
      hasFile: !!req.file
    }
  });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  req.body = value;
  next();
};