const https = require('https');
const fs = require('fs');
const request = require('request');
var admin = require("firebase-admin");
const uuid = require('uuid-v4');
const path = require('path');

var serviceAccount = require("./service-account-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "softhub-5cd5b.appspot.com"
});

var bucket = admin.storage().bucket();


async function uploadFile(filename) {

    const metadata = {
        metadata: {
            // This line is very important. It's to create a download token.
            firebaseStorageDownloadTokens: uuid()
        },
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
    };

    // Uploads a local file to the bucket
    await bucket.upload(filename, {
        // Support for HTTP requests made with `Accept-Encoding: gzip`
        gzip: true,
        metadata: metadata,
    });

    console.log(`${filename} uploaded.`);

}

const options = {
    headers: {
        'x-ig-app-id': "936619743392459",
        "content-type": "application/json",
    },
};

var download = async function (uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

deleteImages = function () {
    fs.readdir('public/images', (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlinkSync(path.join('public/images', file), err => {
                if (err) throw err;
            });
        }
    });
}


function getPosts(res) {
    https.get("https://i.instagram.com/api/v1/users/web_profile_info/?username=soft.hubtr", options, (resp) => {
        let data = '';
        let images = [];


        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            try {
                JSON.parse(data).data.user.edge_owner_to_timeline_media.edges.forEach((item) => {
                    images.push(item.node.display_url);
                });
                images.forEach((item, index) => {
                    download(item, 'public/images/' + index + '.jpg', function () {
                    }).then(() => {
                        uploadFile('public/images/' + index + '.jpg').catch(console.error)
                    });

                });

            } catch (error) {
                console.log(error);
            }
        });

    }
    ).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

setInterval(() => {
    getPosts();
}, 5000);