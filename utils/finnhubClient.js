import { ApiClient, DefaultApi } from "finnhub";

const apikey = ApiClient.instance.authentications["api_key"];

apikey.apiKey = process.env.FINNHUB_API_KEY;

const finnhubClient = new DefaultApi();

export default finnhubClient;
