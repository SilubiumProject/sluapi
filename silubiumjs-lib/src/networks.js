module.exports = {
    silubium: {
        messagePrefix: '\x15Silubium Signed Message:\n',
        bech32: 'bc',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x3f,
        scriptHash: 0x82,
        wif: 0x80
    },
    silubium_testnet: {
        messagePrefix: '\x15Silubium Signed Message:\n',
        bech32: 'tb',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x3f,
        scriptHash: 0x82,
        wif: 0xef
    }
}
