// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RecordIntegrity
 * @dev Anchors the cryptographic hashes of medical records to the Ethereum blockchain.
 * It tracks the mapping of internal MongoDB Record IDs to their SHA-256 hashes.
 * This provides a tamper-evident audit layer without storing sensitive medical data on-chain.
 */
contract RecordIntegrity {
    
    struct RecordAnchor {
        string recordId;
        string recordHash;
        uint256 timestamp;
        address updatedBy; // The wallet address that anchored this hash
    }

    // Mapping from the internal MongoDB Record ID to an array of anchors (supporting versioning/amendments)
    mapping(string => RecordAnchor[]) private recordHistory;

    // Event emitted when a new hash is anchored successfully
    event HashAnchored(string indexed recordId, string recordHash, uint256 timestamp, address indexed updatedBy);

    /**
     * @dev Anchors a new hash for a medical record. 
     */
    function addRecordHash(string memory _recordId, string memory _hash) public {
        RecordAnchor memory newAnchor = RecordAnchor({
            recordId: _recordId,
            recordHash: _hash,
            timestamp: block.timestamp,
            updatedBy: msg.sender
        });

        recordHistory[_recordId].push(newAnchor);

        emit HashAnchored(_recordId, _hash, block.timestamp, msg.sender);
    }

    /**
     * @dev Retrieves the most recent anchored hash for a given record.
     */
    function getLatestHash(string memory _recordId) public view returns (string memory, uint256, address) {
        uint256 length = recordHistory[_recordId].length;
        require(length > 0, "Record not found on blockchain");
        
        RecordAnchor memory latest = recordHistory[_recordId][length - 1];
        return (latest.recordHash, latest.timestamp, latest.updatedBy);
    }

    /**
     * @dev Compares a provided hash against the latest anchored hash.
     * Useful for Boolean verification.
     */
    function verifyRecord(string memory _recordId, string memory _providedHash) public view returns (bool) {
        uint256 length = recordHistory[_recordId].length;
        if (length == 0) return false;

        RecordAnchor memory latest = recordHistory[_recordId][length - 1];
        
        // Compare string hashes by taking their keccak256
        return (keccak256(abi.encodePacked(latest.recordHash)) == keccak256(abi.encodePacked(_providedHash)));
    }
}
