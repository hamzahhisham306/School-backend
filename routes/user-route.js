const express = require("express");
const {
  registerUser,
  loginUser,
  deleteUser,
  getAllUsers, updateUserData
} = require("../controllers/user");
const authenticateMiddleware = require("../middleware/auth-middleware");
const router = express.Router();

router.post("/register", registerUser);
router.delete("/delete-user/:id", deleteUser);
router.get("/allusers", getAllUsers);
router.post("/updateuser/:id", updateUserData);
router.post("/login", loginUser);
router.get("/check-auth", authenticateMiddleware, (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    message: "Authenticated user!",
    data: {
      user,
    },
  });
});

module.exports = router;
