const TitleEscrow = artifacts.require("TitleEscrow");
const ERC721 = artifacts.require("ERC721MintableFull")

module.exports = async function(deployer, network, accounts) {
  const tokenRegistry = await deployer.deploy(ERC721, "test", "test");
  const title = await deployer.deploy(TitleEscrow, ERC721.address, accounts[2]);
};
