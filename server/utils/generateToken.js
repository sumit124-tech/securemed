import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_for_development', {
    expiresIn: process.env.JWT_EXPIRE || '1d',
  });
};

export default generateToken;
