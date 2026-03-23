import { Router, type IRouter } from "express";
import healthRouter from "./health";
import streamingRouter from "./streaming";
import stremioRouter from "./stremio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(streamingRouter);
router.use(stremioRouter);

export default router;
