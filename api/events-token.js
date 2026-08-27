import { events } from "hatchable";

export const access = "public";

export default async function handler(_req, res) {
  res.json(await events.grant(["orderline"]));
}