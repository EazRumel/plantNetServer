const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.JWT_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.decoded = decoded; // attach decoded user to request
    next();
  });
};

module.exports = verifyToken;