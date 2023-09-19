import express from "express";
import {
  getUserInfo,
  getUserPortfolio,
  getUserWallet,
} from "../controllers/userController.js";

const user = express.Router();

user.get("/wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const resp = await getUserWallet(parseInt(userId));
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

user.get("/portfolio/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const resp = await getUserPortfolio(parseInt(userId));
    res.status(200).send(resp);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});

user.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserInfo(parseInt(userId));
    res.status(200).send(user);
  } catch (e) {
    res.status(500).send(e.toString());
  }
});
export default user;
