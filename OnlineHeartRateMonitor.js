﻿var video, width, height, context, graphCanvas, graphContext, bpm;
var hist = [];
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

var constraints = { video: true, audio: false };

function initialize() {
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
        devices.forEach(function (device) {
            console.log(device.kind + ": " + device.label +
                " id = " + device.deviceId/*, JSON.stringify(device,null,2)*/);
            if (device.kind == "videoinput" /*&& constraints.video===true*/)
                constraints.video = { optional: [{ sourceId: device.deviceId }, { fillLightMode: "on" }] };
        });
        initialize2();
    }).catch(function (err) {
        console.log(err.name + ": " + err.message);
    });
}

function initialize2() {
    // The source video.
    video = document.getElementById("v");
    width = video.width;
    height = video.height;

    // The target canvas.
    var canvas = document.getElementById("c");
    context = canvas.getContext("2d");

    // The canvas for the graph
    graphCanvas = document.getElementById("g");
    graphContext = graphCanvas.getContext("2d");

    // The bpm meter
    bpm = document.getElementById("bpm");

    // Get the webcam's stream.
    navigator.getUserMedia(constraints, startStream, function () { });
}

function startStream(stream) {
    video.srcObject = stream;
    video.play();
    // Ready! Let's start drawing.
    requestAnimationFrame(draw);
}

function draw() {
    var frame = readFrame();
    if (frame) {
        getIntensity(frame.data);
    }

    // Wait for the next frame.
    requestAnimationFrame(draw);
}

function readFrame() {
    try {
        context.drawImage(video, 0, 0, width, height);
    } catch (e) {
        // The video may not be ready, yet.
        return null;
    }

    return context.getImageData(0, 0, width, height);
}

function getIntensity(data) {
    var len = data.length;
    var sum = 0;

    for (var i = 0, j = 0; j < len; i++, j += 4) {
        sum += data[j] + data[j + 1] + data[j + 2];
    }
    //console.log(sum / len);
    hist.push({ bright: sum / len, time: Date.now() });
    while (hist.length > graphCanvas.width) hist.shift();
    // max and min
    var max = hist[0].bright;
    var min = hist[0].bright;
    hist.forEach(function (v) {
        if (v.bright > max) max = v.bright;
        if (v.bright < min) min = v.bright;
    });
    // thresholds for bpm
    var lo = min * 0.6 + max * 0.4;
    var hi = min * 0.4 + max * 0.6;
    var pulseAvr = 0, pulseCnt = 0;
    // draw
    var ctx = graphContext;
    ctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    hist.forEach(function (v, x) {
        var y = graphCanvas.height * (v.bright - min) / (max - min);
        ctx.lineTo(x, y);
    });
    ctx.stroke();
    // work out bpm
    var isHi = undefined;
    var lastHi = undefined;
    var lastLo = undefined;
    ctx.fillStyle = "red";
    hist.forEach(function (v, x) {
        if (isHi != true && v.bright > hi) {
            isHi = true;
            lastLo = x;
        }
        if (isHi != false && v.bright < lo) {
            if (lastHi !== undefined && lastLo !== undefined) {
                pulseAvr += hist[x].time - hist[lastHi].time;
                pulseCnt++;
                ctx.fillRect(lastLo, graphCanvas.height - 4, lastHi - lastLo, 4);
            }
            isHi = false;
            lastHi = x;
        }
    });
    // write bpm
    if (pulseCnt) {
        var pulseRate = 60000 / (pulseAvr / pulseCnt);
        bpm.innerHTML = pulseRate.toFixed(0) + " BPM (" + pulseCnt + " pulses)";
    } else {
        bpm.innerHTML = "-- BPM";
    }
}

addEventListener("DOMContentLoaded", initialize);