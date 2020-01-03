# Title Escrow Contract

This smart contract is used for different parties to manage a ERC721 token. It allows a beneficiary of the token to be named and additionally allow a holder to "possess" the token as a form of insurance against the beneficiary. This contract is expected to be used in the context of trade finance where the `Consignee`, typically a bank, will be `beneficiary` where the different buyers and sellers will be the `holder`.

## Interface

```sol
pragma solidity ^0.5.11;

interface ITitleEscrow {
  event TitleReceived(
    address indexed _tokenRegistry,
    address indexed _from,
    uint256 indexed _id
  );
  event TransferEndorsed(
    uint256 indexed _tokenid,
    address indexed _from,
    address indexed _to
  );

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes4 data
  ) external returns (bytes4);

  function changeHolder(address newHolder) external;
  function endorseTransfer(address newBeneficiary) external;
  function transferTo(address newBeneficiary) external;
}

```
