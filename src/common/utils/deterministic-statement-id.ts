import { createHash } from 'node:crypto';

const NAMESPACE = Buffer.from('f5d086e609994c328f4e47a6465d3f19', 'hex');

export const deterministicStatementId = (...parts: string[]): string => {
    const bytes = createHash('sha1')
        .update(NAMESPACE)
        .update(JSON.stringify(parts))
        .digest();

    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.subarray(0, 16).toString('hex');

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-');
};
