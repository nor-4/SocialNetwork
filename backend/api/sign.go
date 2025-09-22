package api

import (
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"log"
	"os"
)

const (
	pubKeyFile  = "id_ed25519.pub"
	privKeyFile = "id_ed25519.pem"
)

var publicKey ed25519.PublicKey
var privateKey ed25519.PrivateKey

func GenOrLoadKey(dataDir string) {
	path := dataDir + "/"

	if err := loadKeys(path); err == nil {
		log.Println("Key pair loaded from disk.")
		return
	}

	log.Println("Generating new key pair...")
	if err := generateKeys(path); err != nil {
		log.Fatalf("Error generating keys: %v", err)
	}
	log.Println("Key pair generated and saved.")
}

func generateKeys(path string) error {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		log.Fatalf("Error generating key: %v", err)
	}
	privateKey = priv
	publicKey = pub

	if err := os.WriteFile(path+pubKeyFile, publicKey, 0644); err != nil {
		return fmt.Errorf("error writing public key: %w", err)
	}
	if err := os.WriteFile(path+privKeyFile, privateKey, 0600); err != nil {
		return fmt.Errorf("error writing private key: %w", err)
	}
	return nil
}

func loadKeys(path string) error {
	privBytes, err := os.ReadFile(path + privKeyFile)
	if err != nil {
		return err
	}
	pubBytes, err := os.ReadFile(path + pubKeyFile)
	if err != nil {
		return err
	}

	if len(privBytes) != ed25519.PrivateKeySize {
		return fmt.Errorf("invalid private key size")
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return fmt.Errorf("invalid public key size")
	}

	privateKey = privBytes
	publicKey = pubBytes
	return nil
}

func sign(dataBytes []byte) string {
	sig := ed25519.Sign(privateKey, dataBytes)
	return hex.EncodeToString(sig)
}

func verify(data string, signature string) bool {

	dataBytes := []byte(data)
	signatureBytes, err := hex.DecodeString(signature)

	if err != nil {
		return false
	}

	return ed25519.Verify(publicKey, dataBytes, signatureBytes)
}
