const TitleEscrow = artifacts.require("TitleEscrow");
const ERC721 = artifacts.require("ERC721MintableFull");
const { expect } = require("chai").use(require("chai-as-promised"));

const SAMPLE_TOKEN_ID =
  "0x624d0d7ae6f44d41d368d8280856dbaac6aa29fb3b35f45b80a7c1c90032eeb3";

contract("TitleEscrow", accounts => {
  const carrier1 = accounts[0];
  const beneficiary1 = accounts[1];
  const beneficiary2 = accounts[2];
  const holder1 = accounts[3];
  const holder2 = accounts[4];

  let ERC721Address = "";
  let ERC721Instance = undefined;

  beforeEach("", async () => {
    ERC721Instance = await ERC721.new("foo", "bar");
    ERC721Address = ERC721Instance.address;
  });

  it("should be instantiated correctly when deployed by beneficiary", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const escrowBeneficiary = await escrowInstance.beneficiary();
    const escrowHolder = await escrowInstance.holder();
    const escrowTokenRegistry = await escrowInstance.tokenRegistry();
    expect(escrowBeneficiary).to.be.equal(beneficiary1);
    expect(escrowHolder).to.be.equal(beneficiary1);
    expect(escrowTokenRegistry).to.be.equal(ERC721Address);
  });

  it("should be instantiated correctly when deployed by 3rd party", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: carrier1
    });

    const escrowBeneficiary = await escrowInstance.beneficiary();
    const escrowHolder = await escrowInstance.holder();
    const escrowTokenRegistry = await escrowInstance.tokenRegistry();
    expect(escrowBeneficiary).to.be.equal(beneficiary1);
    expect(escrowHolder).to.be.equal(carrier1); // TODO: Business rules - who should the holder be?
    expect(escrowTokenRegistry).to.be.equal(ERC721Address);
  });

  it("should receive a ERC721 token correctly", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });
    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const owner = await ERC721Instance.ownerOf(SAMPLE_TOKEN_ID);
    expect(owner).to.equal(escrowInstance.address);
  });

  it("should should fail to receive ERC721 if its from a different registry", async () => {
    const newERC721Instance = await ERC721.new("foo", "bar");

    const escrowInstance = await TitleEscrow.new(
      newERC721Instance.address,
      beneficiary1,
      {
        from: beneficiary1
      }
    );
    const mintTx = ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    await expect(mintTx).to.be.rejectedWith(
      /TitleEscrow: Token does not belong to correct token registry/
    );
  });
  it("should allow exit to another title escrow", async () => {
    const escrowInstance1 = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const escrowInstance2 = await TitleEscrow.new(ERC721Address, beneficiary2, {
      from: beneficiary2
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance1.address,
      SAMPLE_TOKEN_ID
    );

    const transferTx = await escrowInstance1.transferTo(
      escrowInstance2.address,
      { from: beneficiary1 }
    );

    const newOwner = await ERC721Instance.ownerOf(SAMPLE_TOKEN_ID);
    expect(newOwner).to.be.equal(escrowInstance2.address);

    // TODO: Business Rules Questions: how should we indicate that the escrow instance is spent? should we allow re-use?
  });

  it("should allow exit to ethereum wallet", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const transferTx = await escrowInstance.transferTo(beneficiary2, {
      from: beneficiary1
    });

    const newOwner = await ERC721Instance.ownerOf(SAMPLE_TOKEN_ID);
    expect(newOwner).to.be.equal(beneficiary2);
  });
  it("should allow owner to transfer with holder approval", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const transferHolderTx = await escrowInstance.changeHolder(holder1, {
      from: beneficiary1
    });

    expect(await escrowInstance.holder()).to.be.equal(holder1);

    const approveTransferTx = await escrowInstance.approveTransfer(
      beneficiary2,
      { from: holder1 }
    );

    const tranferOwnerTx = await escrowInstance.transferTo(beneficiary2, {
      from: beneficiary1
    });

    const newOwner = await ERC721Instance.ownerOf(SAMPLE_TOKEN_ID);

    expect(newOwner).to.be.equal(beneficiary2);
  });
  it("should allow holder to transfer to new holder", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const transferHolderTx1 = await escrowInstance.changeHolder(holder1, {
      from: beneficiary1
    });
    expect(await escrowInstance.holder()).to.be.equal(holder1);

    const transferHolderTx2 = await escrowInstance.changeHolder(holder2, {
      from: holder1
    });

    expect(await escrowInstance.holder()).to.be.equal(holder2);
  });

  it("should clear holder approvals upon holder change", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const transferHolderTx1 = await escrowInstance.changeHolder(holder1, {
      from: beneficiary1
    });
    expect(await escrowInstance.holder()).to.be.equal(holder1);

    const approveTransferTx = await escrowInstance.approveTransfer(
      beneficiary2,
      { from: holder1 }
    );

    const transferHolderTx2 = await escrowInstance.changeHolder(holder2, {
      from: holder1
    });

    expect(await escrowInstance.holder()).to.be.equal(holder2);
    const attemptToTransferOwnerTx = escrowInstance.transferTo(beneficiary2, {
      from: beneficiary1
    });

    await expect(attemptToTransferOwnerTx).to.be.rejectedWith(
      /TitleEscrow: Transfer target has not been approved by holder/
    );
  });
  it("should not allow owner to transfer to new owner without holder approval", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const transferHolderTx1 = await escrowInstance.changeHolder(holder1, {
      from: beneficiary1
    });
    expect(await escrowInstance.holder()).to.be.equal(holder1);

    const attemptToTransferOwnerTx = escrowInstance.transferTo(beneficiary2, {
      from: beneficiary1
    });

    await expect(attemptToTransferOwnerTx).to.be.rejectedWith(
      /TitleEscrow: Transfer target has not been approved by holder/
    );
  });
  it("should not allow unauthorised party to execute any state change", async () => {
    const escrowInstance = await TitleEscrow.new(ERC721Address, beneficiary1, {
      from: beneficiary1
    });

    const mintTx = await ERC721Instance.safeMint(
      escrowInstance.address,
      SAMPLE_TOKEN_ID
    );

    const attemptToTransferOwnerTx = escrowInstance.transferTo(holder2, {
      from: beneficiary2
    });

    await expect(attemptToTransferOwnerTx).to.be.rejectedWith(
      /HasNamedBeneficiary: only the beneficiary may invoke a transfer/
    );
    const attemptToTransferHolderTx = escrowInstance.changeHolder(holder2, {
      from: beneficiary2
    });

    await expect(attemptToTransferHolderTx).to.be.rejectedWith(
      /HasHolder: only the holder may invoke this function/
    );
    const attemptToApproveTransferTx = escrowInstance.approveTransfer(holder2, {
      from: beneficiary2
    });

    await expect(attemptToApproveTransferTx).to.be.rejectedWith(
      /HasHolder: only the holder may invoke this function/
    );
  });
});
