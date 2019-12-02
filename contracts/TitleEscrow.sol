pragma solidity ^0.5.11;

import "./ERC721.sol";

contract HasNamedBeneficiary is Context {
    address public beneficiary;

    constructor (address _beneficiary) internal {
        beneficiary = _beneficiary ;
    }

    modifier onlyBeneficiary() {
        require(isBeneficiary(), "HasNamedBeneficiary: only the beneficiary may invoke a transfer");
        _;
    }

    function isBeneficiary() public view returns (bool) {
        return _msgSender() == beneficiary;
    }
}

contract HasHolder is Context {
    address public holder;
    
    event HolderChanged(address indexed previousHolder, address indexed newHolder);
    constructor (address _holder) internal {
        holder = _holder;
        emit HolderChanged(address(0), _holder);
    }

    modifier onlyHolder() {
        require(isHolder(), "HasHolder: only the holder may invoke this function");
        _;
    }

    function isHolder() public view returns (bool) {
        return _msgSender() == holder;
    }

    function _changeHolder(address newHolder) internal {
        require(newHolder != address(0), "HasHolder: new holder is the zero address");
        emit HolderChanged(holder, newHolder);
        holder = newHolder;
    }
}

contract TitleEscrow is Context, IERC721Receiver, HasNamedBeneficiary, HasHolder  {
    event TitleReceived(address indexed _tokenRegistry, address indexed _from, uint256 indexed _id);
    event TransferEndorsed(uint256 indexed _tokenid, address indexed _from, address indexed _to);

    enum StatusTypes { Uninitialised, InUse, Exited }
    ERC721 public tokenRegistry;
    uint256 public _tokenId;
    address private approvedTransferTarget = address(0);
    StatusTypes status = StatusTypes.Uninitialised;
    
    constructor(ERC721 _tokenRegistry, address _beneficiary, address _holder) HasNamedBeneficiary(_beneficiary) HasHolder(_holder) public {
        tokenRegistry = ERC721(_tokenRegistry);
    }

    function onERC721Received(
        address operator,   // operator is the account that's initiating the transfer
        address from,       // previous token owner
        uint256 tokenId,
        bytes memory data
    )
        public
        returns(bytes4)
    {
        require(status == StatusTypes.Uninitialised, "TitleEscrow: Contract has been used before");
        require(_msgSender() == address(tokenRegistry), "TitleEscrow: Only tokens from predefined token registry can be accepted");
        _tokenId = tokenId;
        emit TitleReceived(_msgSender(), from, _tokenId);
        status = StatusTypes.InUse;
        return 0x150b7a02;
    }
    
    function changeHolder(address newHolder) public isHoldingToken onlyHolder {
        _changeHolder(newHolder);
    }

    modifier isHoldingToken()  {
        require(_tokenId != uint256(0), "TitleEscrow: Contract is not holding a token");
        require(status == StatusTypes.InUse, "TitleEscrow: Contract is not in use");
        require(tokenRegistry.ownerOf(_tokenId) == address(this),
            "TitleEscrow: Contract is not the owner of token");
        _;
    }
    
    function endorseTransfer(address newBeneficiary) public isHoldingToken onlyBeneficiary {
        emit TransferEndorsed(_tokenId, beneficiary, newBeneficiary);
        approvedTransferTarget = newBeneficiary;
    }

    function transferTo(address newBeneficiary) public isHoldingToken onlyHolder {
        require(newBeneficiary != address(0), "TitleEscrow: Transferring to 0x0 is not allowed");
        if (holder != beneficiary) {
            require(newBeneficiary == approvedTransferTarget, "TitleEscrow: Transfer target has not been endorsed by beneficiary");
        }
        status = StatusTypes.Exited;
        tokenRegistry.safeTransferFrom(address(this), address(newBeneficiary), _tokenId);
    }
}