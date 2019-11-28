pragma solidity ^0.5.5;

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
    constructor () internal {
        address msgSender = _msgSender();
        holder = msgSender;
        emit HolderChanged(address(0), msgSender);
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
    ERC721 public tokenRegistry;
    uint256 public _tokenId;
    address approvedTransferTarget = address(0);
    
    constructor(ERC721 _tokenRegistry, address _beneficiary) HasNamedBeneficiary(_beneficiary) public {
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
        require(_msgSender() == address(tokenRegistry), "TitleEscrow: Token does not belong to correct token registry");
        _tokenId = tokenId;
        emit TitleReceived(_msgSender(), from, _tokenId);
        return 0x150b7a02;
    }
    
    function changeHolder(address newHolder) public onlyHolder {
        _changeHolder(newHolder);
        approvedTransferTarget = address(0); // clear any prior approvals since its not valid anymore
    }
    
    function approveTransfer(address newBeneficiary) public onlyHolder {
        approvedTransferTarget = newBeneficiary;
    }
    
    function transferTo(address newBeneficiary) public onlyBeneficiary {
        if (holder != beneficiary) {
            require(newBeneficiary == approvedTransferTarget, "TitleEscrow: Transfer target has not been approved by holder.");
        }
        tokenRegistry.safeTransferFrom(address(this), address(newBeneficiary), _tokenId);
    }
    
}