// Web Crypto API Utilities for Client-Side Encryption

export async function generateHouseholdKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
}

export async function importKey(jwkJson: string): Promise<CryptoKey> {
    const jwk = JSON.parse(jwkJson);
    return window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(
    data: BufferSource,
    key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv as any,
        },
        key,
        data
    );
    return { ciphertext, iv };
}

export async function decryptData(
    ciphertext: BufferSource,
    iv: Uint8Array,
    key: CryptoKey
): Promise<ArrayBuffer> {
    return window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv as any,
        },
        key,
        ciphertext
    );
}

// Helper to encrypt a File/Blob
export async function encryptFile(file: File, key: CryptoKey) {
    const buffer = await file.arrayBuffer();
    const { ciphertext, iv } = await encryptData(buffer, key);
    return {
        encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
        iv: Array.from(iv), // Convert to array for easier storage/transport
    };
}

// Helper to decrypt to Blob
export async function decryptFile(
    encryptedBlob: Blob,
    iv: number[],
    key: CryptoKey,
    originalMimeType: string
): Promise<Blob> {
    const buffer = await encryptedBlob.arrayBuffer();
    const decryptedBuffer = await decryptData(buffer, new Uint8Array(iv), key);
    return new Blob([decryptedBuffer], { type: originalMimeType });
}
