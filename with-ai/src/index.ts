import express from "express"
import cors from "cors"
import { v1_router } from "./routes/mainRouter";

const app = express()
const port = 3000

app.use(cors());
app.use(express.json());
app.use("/api/v1", v1_router)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})