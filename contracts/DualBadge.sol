// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @notice Non-transferable, open-claim achievements keyed by the Rome EVM caller.
contract DualBadge is Ownable2Step {
    struct BadgeType {
        string metadataURI;
        uint64 maxSupply;
        uint64 minted;
        bool enabled;
    }

    error InvalidBadgeType(uint256 badgeTypeId);
    error InvalidMetadataURI();
    error InvalidSupply();
    error BadgeDisabled(uint256 badgeTypeId);
    error AlreadyMinted(uint256 badgeTypeId, address account);
    error SupplyExhausted(uint256 badgeTypeId);
    error OwnershipRequired();

    event BadgeTypeCreated(uint256 indexed badgeTypeId, string metadataURI, uint64 maxSupply, bool enabled);
    event BadgeTypeUpdated(uint256 indexed badgeTypeId, bool enabled);
    event BadgeMinted(uint256 indexed badgeTypeId, address indexed account);

    uint256 public badgeTypeCount;
    uint256 public totalMinted;
    mapping(uint256 => BadgeType) private _badgeTypes;
    mapping(uint256 => mapping(address => bool)) private _hasBadge;

    constructor() Ownable(msg.sender) {}

    function createBadgeType(string calldata metadataURI, uint64 maxSupply, bool enabled)
        external onlyOwner returns (uint256 badgeTypeId)
    {
        uint256 length = bytes(metadataURI).length;
        if (length == 0 || length > 256) revert InvalidMetadataURI();
        if (maxSupply == 0) revert InvalidSupply();

        badgeTypeId = ++badgeTypeCount;
        _badgeTypes[badgeTypeId] = BadgeType(metadataURI, maxSupply, 0, enabled);
        emit BadgeTypeCreated(badgeTypeId, metadataURI, maxSupply, enabled);
    }

    function setBadgeTypeEnabled(uint256 badgeTypeId, bool enabled) external onlyOwner {
        _badgeType(badgeTypeId).enabled = enabled;
        emit BadgeTypeUpdated(badgeTypeId, enabled);
    }

    function mintBadge(uint256 badgeTypeId) external {
        BadgeType storage badge = _badgeType(badgeTypeId);
        address account = msg.sender;
        if (!badge.enabled) revert BadgeDisabled(badgeTypeId);
        if (_hasBadge[badgeTypeId][account]) revert AlreadyMinted(badgeTypeId, account);
        if (badge.minted == badge.maxSupply) revert SupplyExhausted(badgeTypeId);

        _hasBadge[badgeTypeId][account] = true;
        ++badge.minted;
        ++totalMinted;
        emit BadgeMinted(badgeTypeId, account);
    }

    function getBadgeType(uint256 badgeTypeId) external view returns (BadgeType memory) {
        return _badgeType(badgeTypeId);
    }

    function hasBadge(uint256 badgeTypeId, address account) external view returns (bool) {
        _badgeType(badgeTypeId);
        return _hasBadge[badgeTypeId][account];
    }

    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRequired();
    }

    function _badgeType(uint256 badgeTypeId) private view returns (BadgeType storage badge) {
        if (badgeTypeId == 0 || badgeTypeId > badgeTypeCount) revert InvalidBadgeType(badgeTypeId);
        return _badgeTypes[badgeTypeId];
    }
}
