package api

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
)

type Claims struct {
	Id    int    `json:"id,omitempty"`
	Email string `json:"email,omitempty"`
}

type signedClaims struct {
	Claims    string `json:"claims"`    // JSON-encoded claims
	Signature string `json:"signature"` // Using the sign/verify
}

func (c *Claims) generate() (*signedClaims, error) {

	claimsJSON, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal claims to JSON: %w", err)
	}

	signature := sign(claimsJSON)

	return &signedClaims{
		Claims:    string(claimsJSON),
		Signature: signature,
	}, nil
}

func (sc *signedClaims) verify() (*Claims, error) {
	validSignature := verify(sc.Claims, sc.Signature)

	if !validSignature {
		return nil, fmt.Errorf("signature verification failed")
	}

	var claims Claims
	err := json.Unmarshal([]byte(sc.Claims), &claims)

	if err != nil {
		return nil, fmt.Errorf("failed to marshal claims to JSON: %w", err)
	}

	return &claims, nil
}

func (sc *signedClaims) marshal() (*string, error) {
	signedClaimsJSON, err := json.Marshal(sc)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal signedClaims to JSON: %w", err)
	}

	base64String := base64.StdEncoding.EncodeToString(signedClaimsJSON)
	return &base64String, nil
}

func (sc *signedClaims) unmarshal(base64String *string) error {
	decodedBytes, err := base64.StdEncoding.DecodeString(*base64String)
	if err != nil {
		return fmt.Errorf("failed to base64 decode string: %w", err)
	}

	err = json.Unmarshal(decodedBytes, &sc)
	if err != nil {
		return fmt.Errorf("failed to unmarshal signedClaims from JSON: %w", err)
	}
	return nil
}

func (c *Claims) GetBearer() (*string, error) {
	sc, err := c.generate()

	if err != nil {
		return nil, err
	}

	sig, err := sc.marshal()

	if err != nil {
		return nil, err
	}

	return sig, nil
}

func UnmarshalBearer(raw *string) (*Claims, error) {
	var signedClaims signedClaims
	err := signedClaims.unmarshal(raw)

	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal signedClaims from JSON: %w", err)
	}

	valid, err := signedClaims.verify()

	if err != nil {
		return nil, err
	}

	return valid, err
}
