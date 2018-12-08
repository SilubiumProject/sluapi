const mongoose = require('mongoose');

const jPushDeviceSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        index: true
    },
    tag: {
        type: String,
        required: true,
        index: true
    },
    alias: {
        type: String,
        required: true,
        index: true
    },
    registration_id: {
        type: String,
        required: true,
        index: true
    },
    segment: {
        type: String,
        required: true,
        index: true
    },
    abtest: {
        type: String,
        required: true,
        index: true
    },
    imei: {
        type: String,
        required: true,
        index: true
    },
    address: {
        type: String,
        required: true,
        index: true
    },
    language: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const PushDevice = mongoose.model('PushDevice', jPushDeviceSchema);

module.exports = PushDevice;