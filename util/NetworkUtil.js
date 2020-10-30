function createVarInt(value) {
    const buffer = Buffer.alloc(5); // Max of 5 bytes in a VarInt.

    let bytes = 0;
    for(; bytes<5; ++bytes) { // While there's still bits to encode
        // Encode 7 bits at a time...
        if((value & 0xFFFFFF80) === 0) { // If no more bits after these, break
            buffer.writeUInt8(value & 0x7F, bytes)
            break;
        }

        buffer.writeUInt8((value & 0x7F) | 0x80, bytes) // Flag there's more bytes coming with 8th bit
        value >>>= 7; // Shift all the bits over by 7 (including sign bit)
    }

    return buffer.slice(0, bytes+1);
}

module.exports.PacketOutUtil = class PacketOutUtil {

    constructor() {
        this.buffer = Buffer.alloc(0);
    }

    writeVarInt(value) {
        this.buffer = Buffer.concat([this.buffer, createVarInt(value)]);
    }

    writeUShort(value) {
        const buffer = Buffer.alloc(2);
        buffer.writeInt16BE(value & 0xFFFF, 0);
        this.buffer = Buffer.concat([this.buffer, buffer]);
    }

    writeString(value) {
        const bufferedText = Buffer.from(value, 'utf8');
        this.buffer = Buffer.concat([this.buffer, createVarInt(bufferedText.length), bufferedText]);
    }

    build() {
        const sizeIndicator = createVarInt(this.buffer.length);
        const totalLength = this.buffer.length + sizeIndicator.length;

        return Buffer.concat([sizeIndicator, this.buffer], totalLength);
    }
}

module.exports.PacketInUtil = class PacketInUtil {

    constructor() {
        this.buffer = Buffer.alloc(0);
        this.offset = -1;
    }

    concat(buffer) {
        this.buffer = Buffer.concat([this.buffer, buffer]);
    }

    isReady() {
        const packetInfo = this.getPacketInfo();
        if(packetInfo == null)
            return false;

        const packetSize = packetInfo.header + packetInfo.body;
        const ready = this.buffer.length >= packetSize;

        if(ready && this.offset === -1)
            this.offset = packetInfo.header;

        return ready;
    }

    getPacketInfo() {
        let value = 0;

        let i = 0;
        for(; i<5; ++i) {
            if(this.buffer.length <= i)
                return null;
            const byte = this.buffer.readUInt8(i);
            value |= ((byte & 0x7F) << 7*i);

            if((byte & 0x80) === 0)
                break;
        }

        return { header: i + 1, body: value };
    }

    resetBuffer() {
        this.offset = -1;
        this.isReady();
    }

    readVarInt() {
        if(this.offset === -1)
            return undefined;

        let value = 0;

        let i = 0;
        for(; i<5; ++i) {
            if(this.buffer.length <= this.offset + i)
                return undefined;

            const byte = this.buffer.readUInt8(this.offset + i);
            value |= ((byte & 0x7F) << 7*i);

            if((byte & 0x80) === 0)
                break;
        }

        this.offset += i + 1;
        return value;
    }

    readString() {
        if(this.offset === -1)
            return undefined;

        const length = this.readVarInt();
        if(length === undefined)
            return undefined;

        const str = this.buffer.toString('utf8', this.offset, this.offset + length);
        this.offset += length;

        return str;
    }
}
