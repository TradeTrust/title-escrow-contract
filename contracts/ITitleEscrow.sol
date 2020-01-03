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
    bytes calldata data
  ) external returns (bytes4);

  function changeHolder(address newHolder) external;
  function endorseTransfer(address newBeneficiary) external;
  function transferTo(address newBeneficiary) external;
}
