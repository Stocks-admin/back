import { generateSnapshots } from "../controllers/userController";

generateSnapshots()
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.log(error);
  });
